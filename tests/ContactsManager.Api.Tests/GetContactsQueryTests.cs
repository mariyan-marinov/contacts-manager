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

    private static async Task<Application.Common.PagedResult<Application.Features.Contacts.Contracts.ContactListItem>> Send(
        ContactsApiFactory api,
        GetContactsQuery query)
    {
        using var scope = api.Services.CreateScope();
        var sender = scope.ServiceProvider.GetRequiredService<ISender>();
        return await sender.Send(query, TestContext.Current.CancellationToken);
    }
}
