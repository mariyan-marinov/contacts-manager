using ContactsManager.Domain.Contacts;

namespace ContactsManager.Application.Abstractions;

/// <summary>
/// The write side. Queries deliberately do not come through here — projecting straight off
/// <see cref="IQueryable{T}"/> keeps the query visible instead of hiding it behind a method name.
/// </summary>
public interface IContactRepository
{
    /// <summary>
    /// Returns a tracked aggregate — unlike <see cref="IContactReadContext"/> — because callers load
    /// a contact in order to change it.
    /// </summary>
    Task<Contact?> GetByIdAsync(ContactId id, CancellationToken cancellationToken);

    void Add(Contact contact);

    void Remove(Contact contact);

    /// <summary>
    /// Records the version the client last saw, so a stale update is rejected by the database in the
    /// same statement that would have written it — rather than by a read-then-compare in application
    /// code, which leaves a window for someone else to write in between.
    /// </summary>
    void SetExpectedVersion(Contact contact, uint version);
}
