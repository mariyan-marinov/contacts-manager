using ContactsManager.Application.Features.Contacts.Contracts;
using ContactsManager.Application.Messaging;

namespace ContactsManager.Application.Features.Contacts.GetContactById;

public sealed record GetContactByIdQuery(Guid Id) : IQuery<ContactDetail>;
