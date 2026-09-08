using ContactsManager.Application.Common;
using ContactsManager.Application.Features.Contacts.Contracts;
using ContactsManager.Application.Messaging;

namespace ContactsManager.Application.Features.Contacts.GetContacts;

/// <summary>
/// Bound straight from the query string, so every property needs a usable default: a bare
/// <c>GET /api/contacts</c> is the first page of twenty, by surname, ascending.
/// </summary>
public sealed record GetContactsQuery : IQuery<PagedResult<ContactListItem>>
{
    public const int DefaultSize = 20;
    public const int MaximumSize = 100;

    public string? Search { get; init; }

    public string Sort { get; init; } = ContactSort.Surname;

    public string Direction { get; init; } = ContactSort.Ascending;

    public int Page { get; init; } = 1;

    public int Size { get; init; } = DefaultSize;
}
