using ContactsManager.Application.Messaging;

namespace ContactsManager.Application.Features.Contacts.DeleteContact;

public sealed record DeleteContactCommand(Guid Id) : ICommand<Unit>;
