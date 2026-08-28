using ContactsManager.Application.Abstractions;
using ContactsManager.Application.Common;
using ContactsManager.Application.Messaging;
using ContactsManager.Domain.Contacts;

namespace ContactsManager.Application.Features.Contacts.UpdateContact;

internal sealed class UpdateContactCommandHandler(
    IContactRepository contacts,
    IUnitOfWork unitOfWork,
    TimeProvider clock) : IRequestHandler<UpdateContactCommand, Unit>
{
    public async Task<Unit> Handle(UpdateContactCommand command, CancellationToken cancellationToken)
    {
        var id = new ContactId(command.Id);
        var contact = await contacts.GetByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException(nameof(Contact), command.Id);

        contacts.SetExpectedVersion(contact, command.Version);

        contact.Rename(PersonName.Create(command.FirstName, command.Surname));
        contact.CorrectDateOfBirth(DateOfBirth.Create(command.DateOfBirth, clock));
        contact.MoveTo(Address.Create(
            command.Address.Street,
            command.Address.HouseNumber,
            command.Address.PostalCode,
            command.Address.City,
            command.Address.Country));
        contact.ChangePhone(PhoneNumber.Create(command.PhoneNumber));
        contact.ChangeIban(Iban.Create(command.Iban));

        await unitOfWork.SaveChangesAsync(cancellationToken);

        return Unit.Value;
    }
}
