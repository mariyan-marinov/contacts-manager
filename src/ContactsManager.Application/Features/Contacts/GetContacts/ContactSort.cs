using System.Collections.Frozen;
using ContactsManager.Domain.Contacts;

namespace ContactsManager.Application.Features.Contacts.GetContacts;

/// <summary>
/// Sorting is a closed set. The ordering is chosen by a switch over these constants rather than built
/// from the caller's string, so no client input can ever reach the ORDER BY clause.
/// </summary>
internal static class ContactSort
{
    internal const string Surname = "surname";
    internal const string FirstName = "firstName";
    internal const string City = "city";
    internal const string DateOfBirth = "dateOfBirth";

    internal const string Ascending = "asc";
    internal const string Descending = "desc";

    internal static readonly FrozenSet<string> AllowedFields =
        new[] { Surname, FirstName, City, DateOfBirth }.ToFrozenSet(StringComparer.OrdinalIgnoreCase);

    internal static readonly FrozenSet<string> AllowedDirections =
        new[] { Ascending, Descending }.ToFrozenSet(StringComparer.OrdinalIgnoreCase);

    internal static IOrderedQueryable<Contact> Apply(IQueryable<Contact> contacts, string field, bool descending) =>
        (field.ToLowerInvariant(), descending) switch
        {
            ("surname", false) => contacts.OrderBy(c => c.Name.Surname).ThenBy(c => c.Name.First),
            ("surname", true) => contacts.OrderByDescending(c => c.Name.Surname).ThenByDescending(c => c.Name.First),
            ("firstname", false) => contacts.OrderBy(c => c.Name.First).ThenBy(c => c.Name.Surname),
            ("firstname", true) => contacts.OrderByDescending(c => c.Name.First).ThenByDescending(c => c.Name.Surname),
            ("city", false) => contacts.OrderBy(c => c.Address.City).ThenBy(c => c.Name.Surname),
            ("city", true) => contacts.OrderByDescending(c => c.Address.City).ThenBy(c => c.Name.Surname),
            ("dateofbirth", false) => contacts.OrderBy(c => c.DateOfBirth.Value).ThenBy(c => c.Name.Surname),
            ("dateofbirth", true) => contacts.OrderByDescending(c => c.DateOfBirth.Value).ThenBy(c => c.Name.Surname),
            _ => throw new ArgumentOutOfRangeException(nameof(field), field, "Unsupported sort field."),
        };
}
