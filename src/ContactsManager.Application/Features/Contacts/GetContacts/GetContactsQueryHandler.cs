using ContactsManager.Application.Abstractions;
using ContactsManager.Application.Common;
using ContactsManager.Application.Features.Contacts.Contracts;
using ContactsManager.Application.Messaging;
using ContactsManager.Domain.Contacts;
using ContactsManager.Domain.Validation;
using Microsoft.EntityFrameworkCore;

namespace ContactsManager.Application.Features.Contacts.GetContacts;

internal sealed class GetContactsQueryHandler(IContactReadContext read)
    : IRequestHandler<GetContactsQuery, PagedResult<ContactListItem>>
{
    public async Task<PagedResult<ContactListItem>> Handle(
        GetContactsQuery query,
        CancellationToken cancellationToken)
    {
        var matching = ApplySearch(read.Contacts, query.Search);
        var total = await matching.CountAsync(cancellationToken);

        var ordered = ContactSort.Apply(matching, query.Sort, query.Direction.Equals(
            ContactSort.Descending,
            StringComparison.OrdinalIgnoreCase));

        var rows = await ordered
            .Skip((query.Page - 1) * query.Size)
            .Take(query.Size)
            .Select(contact => new ContactRow(
                contact.Id.Value,
                contact.Name.First,
                contact.Name.Surname,
                contact.DateOfBirth.Value,
                contact.Address.City,
                contact.Address.Country,
                contact.Phone.Value,
                contact.Iban.Value))
            .ToListAsync(cancellationToken);

        var items = rows.ConvertAll(row => new ContactListItem(
            row.Id,
            row.FirstName,
            row.Surname,
            row.DateOfBirth,
            row.City,
            row.Country,
            row.PhoneNumber,
            IbanText.Mask(row.Iban)));

        return new PagedResult<ContactListItem>(items, total, query.Page, query.Size);
    }

    private static IQueryable<Contact> ApplySearch(IQueryable<Contact> contacts, string? search)
    {
        if (string.IsNullOrWhiteSpace(search))
        {
            return contacts;
        }

        var pattern = $"%{search.Trim().ToLowerInvariant()}%";

        return contacts.Where(contact =>
            EF.Functions.Like(contact.Name.First.ToLower(), pattern)
            || EF.Functions.Like(contact.Name.Surname.ToLower(), pattern)
            || EF.Functions.Like(contact.Address.City.ToLower(), pattern));
    }

    /// <summary>
    /// The raw row as it comes back from SQL. The IBAN is masked on the way into
    /// <see cref="ContactListItem"/> using the same helper the domain uses, so the format is defined
    /// once and the full value never reaches a response.
    /// </summary>
    private sealed record ContactRow(
        Guid Id,
        string FirstName,
        string Surname,
        DateOnly DateOfBirth,
        string City,
        string Country,
        string PhoneNumber,
        string Iban);
}
