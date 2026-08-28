using ContactsManager.Domain.Contacts;

namespace ContactsManager.Application.Abstractions;

/// <summary>
/// The write side. Queries deliberately do not come through here — projecting straight off
/// <see cref="IQueryable{T}"/> keeps the query visible instead of hiding it behind a method name.
/// </summary>
public interface IContactRepository
{
    Task<Contact?> GetByIdAsync(ContactId id, CancellationToken cancellationToken);

    void Add(Contact contact);

    void Remove(Contact contact);
}
