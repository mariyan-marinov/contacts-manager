using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ContactsManager.Api.Tests.Support;

namespace ContactsManager.Api.Tests;

/// <summary>
/// The contract the Angular client is written against. These assert on status codes and on the
/// serialised JSON, because that — not the DTO type — is what a caller actually receives.
/// </summary>
public class ContactsContractTests
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    [Fact]
    public async Task Creating_a_contact_returns_201_and_a_location_that_resolves()
    {
        await using var api = new ContactsApiFactory();
        var client = await api.CreateResetClientAsync();

        var created = await client.PostAsJsonAsync("/api/contacts", ContactPayloads.Valid(), Json, Cancellation);

        Assert.Equal(HttpStatusCode.Created, created.StatusCode);
        Assert.NotNull(created.Headers.Location);

        var followed = await client.GetAsync(created.Headers.Location, Cancellation);

        Assert.Equal(HttpStatusCode.OK, followed.StatusCode);
        Assert.Equal("Zwart", (await Detail(followed)).GetProperty("surname").GetString());
    }

    [Fact]
    public async Task Creating_a_contact_with_a_broken_iban_returns_400_against_the_iban_field()
    {
        await using var api = new ContactsApiFactory();
        var client = await api.CreateResetClientAsync();

        var response = await client.PostAsJsonAsync(
            "/api/contacts",
            ContactPayloads.Valid(iban: "GB00WRONG"),
            Json,
            Cancellation);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        var errors = (await Body(response)).GetProperty("errors");

        Assert.True(errors.TryGetProperty("iban", out var ibanErrors), "expected an 'iban' key in errors");
        Assert.NotEmpty(ibanErrors.EnumerateArray());
    }

    [Fact]
    public async Task A_nested_field_error_is_keyed_by_its_full_camel_cased_path()
    {
        await using var api = new ContactsApiFactory();
        var client = await api.CreateResetClientAsync();
        var payload = ContactPayloads.Valid();
        var blankCity = payload with { Address = payload.Address with { City = "" } };

        var response = await client.PostAsJsonAsync("/api/contacts", blankCity, Json, Cancellation);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        var errors = (await Body(response)).GetProperty("errors");

        // The Angular form binds errors by control path, so every segment has to be camel-cased.
        Assert.True(
            errors.TryGetProperty("address.city", out _),
            $"expected 'address.city'; got: {string.Join(", ", errors.EnumerateObject().Select(field => field.Name))}");
    }

    [Fact]
    public async Task Accepts_an_iban_written_in_the_spaced_form_people_actually_use()
    {
        await using var api = new ContactsApiFactory();
        var client = await api.CreateResetClientAsync();

        var response = await client.PostAsJsonAsync(
            "/api/contacts",
            ContactPayloads.Valid(iban: "nl91 abna 0417 1643 00"),
            Json,
            Cancellation);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
    }

    [Fact]
    public async Task Creating_a_contact_born_tomorrow_returns_400_against_the_date_field()
    {
        await using var api = new ContactsApiFactory();
        var client = await api.CreateResetClientAsync();
        var tomorrow = DateOnly.FromDateTime(DateTime.UtcNow).AddDays(1).ToString("yyyy-MM-dd");

        var response = await client.PostAsJsonAsync(
            "/api/contacts",
            ContactPayloads.Valid(dateOfBirth: tomorrow),
            Json,
            Cancellation);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        var errors = (await Body(response)).GetProperty("errors");

        Assert.True(errors.TryGetProperty("dateOfBirth", out _), "expected a 'dateOfBirth' key in errors");
    }

    [Fact]
    public async Task Fetching_an_unknown_contact_returns_404_as_problem_details()
    {
        await using var api = new ContactsApiFactory();
        var client = await api.CreateResetClientAsync();

        var response = await client.GetAsync($"/api/contacts/{Guid.NewGuid()}", Cancellation);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        Assert.Equal("Contact not found.", (await Body(response)).GetProperty("title").GetString());
    }

    [Fact]
    public async Task Listing_contacts_honours_the_paging_contract()
    {
        await using var api = new ContactsApiFactory();
        var client = await api.CreateResetClientAsync();

        var response = await client.GetAsync(
            "/api/contacts?sort=surname&direction=desc&page=2&size=5",
            Cancellation);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = await Body(response);

        Assert.Equal(12, body.GetProperty("total").GetInt32());
        Assert.Equal(2, body.GetProperty("page").GetInt32());
        Assert.Equal(5, body.GetProperty("size").GetInt32());
        Assert.Equal(5, body.GetProperty("items").GetArrayLength());
    }

    [Theory]
    [InlineData("sort=iban")]
    [InlineData("size=5000")]
    [InlineData("page=0")]
    public async Task Listing_contacts_refuses_input_outside_the_contract(string queryString)
    {
        await using var api = new ContactsApiFactory();
        var client = await api.CreateResetClientAsync();

        var response = await client.GetAsync($"/api/contacts?{queryString}", Cancellation);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task The_list_carries_a_masked_iban_and_no_iban_key_at_all()
    {
        await using var api = new ContactsApiFactory();
        var client = await api.CreateResetClientAsync();

        var raw = await client.GetStringAsync("/api/contacts?size=100", Cancellation);

        Assert.Contains("ibanMasked", raw, StringComparison.Ordinal);
        Assert.DoesNotContain("\"iban\"", raw, StringComparison.Ordinal);

        var first = JsonSerializer.Deserialize<JsonElement>(raw).GetProperty("items")[0];

        Assert.Matches(@"^.{4}\*{4}.{4}$", first.GetProperty("ibanMasked").GetString());
        Assert.False(first.TryGetProperty("iban", out _), "the list item must not carry a full IBAN");
    }

    [Fact]
    public async Task The_detail_carries_the_full_iban_and_a_version()
    {
        await using var api = new ContactsApiFactory();
        var client = await api.CreateResetClientAsync();
        var id = await FirstContactId(client);

        var detail = await Detail(await client.GetAsync($"/api/contacts/{id}", Cancellation));

        Assert.Matches("^[A-Z]{2}[0-9]{2}[A-Z0-9]+$", detail.GetProperty("iban").GetString());
        Assert.True(detail.GetProperty("version").GetUInt32() > 0);
    }

    [Fact]
    public async Task Updating_with_the_current_version_returns_204_and_a_stale_one_returns_409()
    {
        await using var api = new ContactsApiFactory();
        var client = await api.CreateResetClientAsync();
        var id = await FirstContactId(client);

        var detail = await Detail(await client.GetAsync($"/api/contacts/{id}", Cancellation));
        var version = detail.GetProperty("version").GetUInt32();
        var payload = ContactPayloads.Valid(surname: "Renamed").WithVersion(version);

        var accepted = await client.PutAsJsonAsync($"/api/contacts/{id}", payload, Json, Cancellation);

        Assert.Equal(HttpStatusCode.NoContent, accepted.StatusCode);

        // Same version again: the row has moved on, so this write is the stale one.
        var rejected = await client.PutAsJsonAsync($"/api/contacts/{id}", payload, Json, Cancellation);

        Assert.Equal(HttpStatusCode.Conflict, rejected.StatusCode);
        Assert.Equal(
            "The contact was changed by someone else.",
            (await Body(rejected)).GetProperty("title").GetString());
    }

    [Fact]
    public async Task Updating_an_unknown_contact_returns_404()
    {
        await using var api = new ContactsApiFactory();
        var client = await api.CreateResetClientAsync();

        var response = await client.PutAsJsonAsync(
            $"/api/contacts/{Guid.NewGuid()}",
            ContactPayloads.Valid().WithVersion(1),
            Json,
            Cancellation);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Deleting_returns_204_and_deleting_again_returns_404()
    {
        await using var api = new ContactsApiFactory();
        var client = await api.CreateResetClientAsync();
        var id = await FirstContactId(client);

        var deleted = await client.DeleteAsync($"/api/contacts/{id}", Cancellation);
        var deletedAgain = await client.DeleteAsync($"/api/contacts/{id}", Cancellation);

        Assert.Equal(HttpStatusCode.NoContent, deleted.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, deletedAgain.StatusCode);
    }

    [Fact]
    public async Task The_reset_endpoint_exists_under_test_and_nowhere_else()
    {
        await using var underTest = new ContactsApiFactory("Test");
        await using var underDevelopment = new ContactsApiFactory("Development");

        var inTest = await underTest.CreateClient().PostAsync("/api/test/reset", content: null, Cancellation);
        var inDevelopment = await underDevelopment.CreateClient()
            .PostAsync("/api/test/reset", content: null, Cancellation);

        Assert.Equal(HttpStatusCode.OK, inTest.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, inDevelopment.StatusCode);
    }

    private static CancellationToken Cancellation => TestContext.Current.CancellationToken;

    private static async Task<JsonElement> Body(HttpResponseMessage response) =>
        JsonSerializer.Deserialize<JsonElement>(await response.Content.ReadAsStringAsync(Cancellation));

    private static Task<JsonElement> Detail(HttpResponseMessage response) => Body(response);

    private static async Task<Guid> FirstContactId(HttpClient client)
    {
        var list = await Body(await client.GetAsync("/api/contacts?size=1", Cancellation));
        return list.GetProperty("items")[0].GetProperty("id").GetGuid();
    }
}
