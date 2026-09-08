using System.Collections.Frozen;
using System.Linq.Expressions;
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

    /// <summary>
    /// Every ordering names a second key, so rows with the same city or the same birthday still come
    /// back in a settled order — without one, two requests for the same page could disagree about
    /// which rows belong on it.
    /// </summary>
    internal static IOrderedQueryable<Contact> Apply(IQueryable<Contact> contacts, string field, bool descending) =>
        field.ToLowerInvariant() switch
        {
            "surname" => Order(contacts, c => c.Name.Surname, c => c.Name.First, descending),
            "firstname" => Order(contacts, c => c.Name.First, c => c.Name.Surname, descending),
            "city" => Order(contacts, c => c.Address.City, c => c.Name.Surname, descending),
            "dateofbirth" => Order(contacts, c => c.DateOfBirth.Value, c => c.Name.Surname, descending),
            _ => throw new ArgumentOutOfRangeException(nameof(field), field, "Unsupported sort field."),
        };

    /// <summary>
    /// The direction is applied in one place, so the second key always follows the first: a
    /// descending sort reads as the mirror of its ascending twin rather than reversing only half of
    /// the ordering.
    /// </summary>
    private static IOrderedQueryable<Contact> Order<TPrimary, TSecondary>(
        IQueryable<Contact> contacts,
        Expression<Func<Contact, TPrimary>> primary,
        Expression<Func<Contact, TSecondary>> secondary,
        bool descending) =>
        descending
            ? contacts.OrderByDescending(primary).ThenByDescending(secondary)
            : contacts.OrderBy(primary).ThenBy(secondary);
}
