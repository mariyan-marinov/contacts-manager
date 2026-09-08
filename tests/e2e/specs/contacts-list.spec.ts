import { expect, test } from "../fixtures";

test("shows the seeded contacts, sorted by surname", async ({
  contactsList,
}) => {
  await contactsList.goto();

  const surnames = await contactsList.surnames();

  expect(surnames).toEqual(
    [...surnames].sort((left, right) => left.localeCompare(right)),
  );
  expect(surnames).toContain("Bakker");
  expect(surnames).toContain("Steiner");
  expect(surnames).toHaveLength(12);
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
  await expect(contactsList.rows()).toHaveCount(5);

  const paged = page.waitForRequest((request) =>
    request.url().includes("page=2"),
  );
  await contactsList.goToNextPage();
  await paged;

  // The request having been sent is not the page having arrived. Waiting for the paginator to say
  // which rows it is showing is what makes the comparison below about the second page.
  await expect(contactsList.pageReport()).toHaveText("6–10 of 12");

  // The address bar follows the store, so this view survives a reload.
  await expect(page).toHaveURL(/page=2/);
  const beforeReload = await contactsList.surnames();
  await page.reload();
  await contactsList.waitForRows();
  await expect(contactsList.pageReport()).toHaveText("6–10 of 12");

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

  await contactsList.edit("Fabian Meier");
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
