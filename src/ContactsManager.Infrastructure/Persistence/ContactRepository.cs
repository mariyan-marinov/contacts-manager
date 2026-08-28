using ContactsManager.Application.Abstractions;
using ContactsManager.Domain.Contacts;
using Microsoft.EntityFrameworkCore;

namespace ContactsManager.Infrastructure.Persistence;

internal sealed class ContactRepository(ContactsDbContext context) : IContactRepository
{
    public Task<Contact?> GetByIdAsync(ContactId id, CancellationToken cancellationToken) =>
        context.Contacts.FirstOrDefaultAsync(contact => contact.Id == id, cancellationToken);

    public void Add(Contact contact) => context.Contacts.Add(contact);

    public void Remove(Contact contact) => context.Contacts.Remove(contact);
}
