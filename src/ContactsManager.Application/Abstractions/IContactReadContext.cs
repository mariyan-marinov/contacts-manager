using ContactsManager.Domain.Contacts;

namespace ContactsManager.Application.Abstractions;

/// <summary>
/// The read side. Queries project straight off this — wrapping them in repository methods would only
/// hide the query behind a name. Implementations return an untracked sequence.
/// </summary>
public interface IContactReadContext
{
    IQueryable<Contact> Contacts { get; }
}
