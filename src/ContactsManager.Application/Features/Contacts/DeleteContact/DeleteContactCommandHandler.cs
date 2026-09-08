using ContactsManager.Application.Abstractions;
using ContactsManager.Application.Common;
using ContactsManager.Application.Messaging;
using ContactsManager.Domain.Contacts;

namespace ContactsManager.Application.Features.Contacts.DeleteContact;

internal sealed class DeleteContactCommandHandler(
    IContactRepository contacts,
    IUnitOfWork unitOfWork) : IRequestHandler<DeleteContactCommand, Unit>
{
    /// <summary>
    /// The contact is loaded first so deleting something that is already gone answers 404 instead of
    /// succeeding against nothing.
    /// </summary>
    public async Task<Unit> Handle(DeleteContactCommand command, CancellationToken cancellationToken)
    {
        var contact = await contacts.GetByIdAsync(new ContactId(command.Id), cancellationToken)
            ?? throw new NotFoundException(nameof(Contact), command.Id);

        contacts.Remove(contact);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return Unit.Value;
    }
}
