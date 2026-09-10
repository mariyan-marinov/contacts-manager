import { expect, test } from "../fixtures";

test("shows the first page of the seeded contacts, sorted by surname", async ({
  contactsList,
}) => {
  await contactsList.goto();

  const surnames = await contactsList.surnames();

  expect(surnames).toEqual(
    [...surnames].sort((left, right) => left.localeCompare(right)),
  );
  expect(surnames).toContain("Bakker");
  // A page of twenty out of fifty-five, so the list is genuinely paged rather than showing
  // everything the seed holds.
  expect(surnames).toHaveLength(20);
  await expect(contactsList.pageReport()).toHaveText("1–20 of 55");
});

test("shows the name the way it is written, first name then surname", async ({
  contactsList,
}) => {
  await contactsList.goto();

  expect(await contactsList.columnTitles()).toEqual([
    "First name",
    "Surname",
    "Date of birth",
    "City",
    "Phone",
    "IBAN",
    "Actions",
  ]);

  // The first cell is the given name, and it is the link that opens the contact.
  await expect(contactsList.rowFor("Bakker").locator("td").first()).toHaveText("Sanne");
  // Read out as the whole name, even though the cell shows half of it.
  await expect(
    contactsList.rowFor("Bakker").getByRole("link", { name: "Sanne Bakker", exact: true }),
  ).toBeVisible();
});

/**
 * The list writes a name as "Sanne Bakker", so a term typed that way has to find it — even though
 * it runs across two columns and neither one contains it.
 */
test("finds a contact from a term spanning the first name and the surname", async ({
  contactsList,
  page,
}) => {
  await contactsList.goto();

  const searched = page.waitForRequest((request) => request.url().includes("search="));
  await contactsList.search("nne Bak");
  await searched;

  await expect(contactsList.rows()).toHaveCount(1);
  expect(await contactsList.firstNames()).toEqual(["Sanne"]);
  expect(await contactsList.surnames()).toEqual(["Bakker"]);
});

test("does not join two different contacts into one searchable name", async ({
  contactsList,
  page,
}) => {
  await contactsList.goto();

  const searched = page.waitForRequest((request) => request.url().includes("search="));
  await contactsList.search("Bakker Milan");
  await searched;

  await expect(contactsList.emptyState()).toContainText("No contacts match");
});

test("searching, sorting and paging each ask the server for the new view", async ({
  contactsList,
  page,
}) => {
  await contactsList.goto("?size=5");

  const searched = page.waitForRequest((request) =>
    request.url().includes("search=ber"),
  );
  await contactsList.search("ber");
  expect(new URL((await searched).url()).searchParams.get("page")).toBe("1");

  const sorted = page.waitForRequest((request) =>
    request.url().includes("direction=desc"),
  );
  await contactsList.sortBySurname();
  await sorted;

  await contactsList.search("");
  // Clearing the search is debounced, so it has to be allowed to land before paging on top of it —
  // otherwise the two query changes race and whichever response arrives last wins. The total is
  // the signal: unlike the page numbers, it comes from the response rather than from the store.
  await expect(contactsList.pageReport()).toHaveText("1–5 of 55");
  await expect(contactsList.rows()).toHaveCount(5);

  const paged = page.waitForRequest((request) =>
    request.url().includes("page=2"),
  );
  await contactsList.goToNextPage();
  await paged;

  await expect(contactsList.pageReport()).toHaveText("6–10 of 55");

  // The address bar follows the store, so this view survives a reload.
  await expect(page).toHaveURL(/page=2/);
  const beforeReload = await contactsList.surnames();
  await page.reload();
  await contactsList.waitForRows();
  await expect(contactsList.pageReport()).toHaveText("6–10 of 55");

  expect(await contactsList.surnames()).toEqual(beforeReload);
});

test("masks the IBAN in the list and shows it in full only on the contact", async ({
  contactsList,
  contactForm,
}) => {
  await contactsList.goto();

  expect(await contactsList.maskedIbanFor("Bakker")).toBe("NL91****4300");

  await contactsList.edit("Sanne Bakker");

  await expect(contactForm.ibanValue()).toHaveValue("NL91ABNA0417164300");
});

test("the list a user set up survives a trip through the form", async ({
  contactsList,
  contactForm,
  page,
}) => {
  await contactsList.goto("?size=10&page=2");

  await contactsList.editFirstRow();
  await contactForm.set("Phone number", "+41 44 215 9061");
  await contactForm.save();

  await contactsList.waitForRows();

  // Saving used to drop the query, which reset the page size to the default of twenty.
  await expect(page).toHaveURL(/size=10/);
  await expect(page).toHaveURL(/page=2/);
  await expect(contactsList.rowsPerPage()).toHaveText("10");
});

test("one page of the list costs exactly one request", async ({
  contactsList,
  page,
}) => {
  const listCalls: string[] = [];
  page.on("request", (request) => {
    if (/\/api\/contacts\?/.test(request.url())) {
      listCalls.push(request.url());
    }
  });

  await contactsList.goto("?size=10");
  // A pause rather than a poll: the point is that nothing else arrives. The table re-announces
  // its paging and sorting as its inputs settle, and those echoes used to become four more
  // requests, each cancelling the one before it.
  await page.waitForTimeout(1500);
  expect(listCalls).toHaveLength(1);

  await contactsList.goToNextPage();
  await page.waitForTimeout(1500);
  expect(listCalls).toHaveLength(2);
});

/**
 * One character matches a large slice of any address book, so it is the start of a search rather
 * than a search. Nothing should be sent until there is a second one.
 */
test("waits for a second character before it searches", async ({ contactsList, page }) => {
  const listCalls: string[] = [];
  page.on("request", (request) => {
    if (/\/api\/contacts\?/.test(request.url())) {
      listCalls.push(request.url());
    }
  });

  await contactsList.goto();
  expect(listCalls).toHaveLength(1);

  await contactsList.search("b");

  await expect(contactsList.searchHint()).toContainText("2 characters or more");
  // A pause rather than a poll: the point is that nothing is sent, and the debounce is 300 ms.
  await page.waitForTimeout(1200);
  expect(listCalls).toHaveLength(1);
  // Still the whole address book, not a list narrowed by a single letter.
  await expect(contactsList.pageReport()).toHaveText("1–20 of 55");

  const searched = page.waitForRequest((request) => request.url().includes("search=ba"));
  await contactsList.search("ba");
  await searched;

  await expect(contactsList.searchHint()).not.toContainText("characters or more");
  await expect(contactsList.pageReport()).not.toHaveText("1–20 of 55");
});

test("stops searching again when the term drops back to one character", async ({
  contactsList,
  page,
}) => {
  await contactsList.goto();

  const searched = page.waitForRequest((request) => request.url().includes("search=ba"));
  await contactsList.search("ba");
  await searched;

  const cleared = page.waitForRequest(
    (request) => /\/api\/contacts\?/.test(request.url()) && !request.url().includes("search="),
  );
  await contactsList.search("b");
  await cleared;

  // The filter goes with the term that justified it, rather than being left applied to a term
  // that is no longer on screen.
  await expect(contactsList.pageReport()).toHaveText("1–20 of 55");
  await expect(contactsList.searchHint()).toContainText("2 characters or more");
});

test("tells a search that matched nothing apart from an empty address book", async ({
  contactsList,
}) => {
  await contactsList.goto();

  await contactsList.search("qqqqqq");

  // The offer has to match the reason: this is a search to clear, not a first contact to add.
  await expect(contactsList.emptyState()).toContainText("No contacts match");
  await expect(
    contactsList.emptyState().getByRole("button", { name: "Clear search" }),
  ).toBeVisible();
});
