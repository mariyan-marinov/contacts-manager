using ContactsManager.Api.Tests.Support;
using ContactsManager.Application.Features.Contacts.GetContacts;
using ContactsManager.Application.Messaging;
using FluentValidation;
using Microsoft.Extensions.DependencyInjection;

namespace ContactsManager.Api.Tests;

/// <summary>
/// The query side is only worth having if the database does the work. These assert on the SQL EF
/// actually sent, not on the shape of the returned list.
/// </summary>
public class GetContactsQueryTests
{
    [Fact]
    public async Task Filters_orders_and_pages_inside_a_single_statement()
    {
        await using var api = new ContactsApiFactory();
        var page = await Send(
            api,
            new GetContactsQuery { Search = "ber", Sort = "surname", Direction = "desc", Page = 2, Size = 5 });

        var pageStatement = api.CapturedSql.Statements.Single(sql => sql.Contains("LIMIT", StringComparison.Ordinal));

        Assert.Contains("LIKE", pageStatement, StringComparison.Ordinal);
        Assert.Contains("ORDER BY", pageStatement, StringComparison.Ordinal);
        Assert.Contains("OFFSET", pageStatement, StringComparison.Ordinal);
        Assert.Contains("DESC", pageStatement, StringComparison.Ordinal);
        Assert.Equal(2, page.Page);
        Assert.Equal(5, page.Size);
    }

    [Fact]
    public async Task Counts_the_whole_match_in_the_database()
    {
        await using var api = new ContactsApiFactory();
        await Send(api, new GetContactsQuery { Search = "ber" });

        Assert.Contains(
            api.CapturedSql.Statements,
            sql => sql.Contains("count(*)", StringComparison.OrdinalIgnoreCase));
    }

    [Fact]
    public async Task Masks_the_iban_and_never_returns_the_full_value()
    {
        await using var api = new ContactsApiFactory();
        var page = await Send(api, new GetContactsQuery { Size = 100 });

        Assert.NotEmpty(page.Items);
        Assert.All(page.Items, item => Assert.Matches(@"^.{4}\*{4}.{4}$", item.IbanMasked));
    }

    [Theory]
    [InlineData("iban")]
    [InlineData("1; drop table contacts")]
    [InlineData("Name.Surname")]
    public async Task Refuses_a_sort_field_outside_the_whitelist(string sort)
    {
        await using var api = new ContactsApiFactory();

        await Assert.ThrowsAsync<ValidationException>(
            () => Send(api, new GetContactsQuery { Sort = sort }));
    }

    [Theory]
    [InlineData(0, 20)]
    [InlineData(-1, 20)]
    [InlineData(1, 5000)]
    [InlineData(1, 0)]
    public async Task Refuses_paging_outside_the_contract(int page, int size)
    {
        await using var api = new ContactsApiFactory();

        await Assert.ThrowsAsync<ValidationException>(
            () => Send(api, new GetContactsQuery { Page = page, Size = size }));
    }

    /// <summary>
    /// A typed <c>%</c> means those characters, not "match anything". Without escaping, searching
    /// for it returned every contact in the book.
    /// </summary>
    [Theory]
    [InlineData("%")]
    [InlineData("_")]
    [InlineData("%%")]
    [InlineData("Bakke%")]
    [InlineData("B_kker")]
    public async Task Treats_a_like_wildcard_as_a_character_to_search_for(string search)
    {
        await using var api = new ContactsApiFactory();

        var page = await Send(api, new GetContactsQuery { Search = search, Size = 100 });

        Assert.Empty(page.Items);
        Assert.Equal(0, page.Total);
    }

    [Fact]
    public async Task Escapes_the_escape_character_so_a_typed_backslash_is_literal()
    {
        await using var api = new ContactsApiFactory();

        var page = await Send(api, new GetContactsQuery { Search = @"\", Size = 100 });

        Assert.Empty(page.Items);
    }

    [Fact]
    public async Task Still_matches_a_plain_substring_of_a_name_or_a_city()
    {
        await using var api = new ContactsApiFactory();

        var page = await Send(api, new GetContactsQuery { Search = "bakke", Size = 100 });

        Assert.Equal("Bakker", Assert.Single(page.Items).Surname);
    }

    /// <summary>
    /// A descending sort mirrors its ascending twin, second key included — so paging through one is
    /// the reverse of paging through the other rather than half-reversed.
    /// </summary>
    [Fact]
    public async Task Reverses_the_whole_ordering_when_the_direction_is_descending()
    {
        await using var api = new ContactsApiFactory();

        var ascending = await Send(api, new GetContactsQuery { Sort = "city", Size = 100 });
        var descending = await Send(
            api,
            new GetContactsQuery { Sort = "city", Direction = "desc", Size = 100 });

        Assert.Equal(
            ascending.Items.Select(item => item.Id).Reverse(),
            descending.Items.Select(item => item.Id));
    }

    private static async Task<Application.Common.PagedResult<Application.Features.Contacts.Contracts.ContactListItem>> Send(
        ContactsApiFactory api,
        GetContactsQuery query)
    {
        using var scope = api.Services.CreateScope();
        var sender = scope.ServiceProvider.GetRequiredService<ISender>();
        return await sender.Send(query, TestContext.Current.CancellationToken);
    }
}
