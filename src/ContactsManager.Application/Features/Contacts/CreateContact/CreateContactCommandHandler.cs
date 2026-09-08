using ContactsManager.Application.Abstractions;
using ContactsManager.Application.Messaging;
using ContactsManager.Domain.Contacts;

namespace ContactsManager.Application.Features.Contacts.CreateContact;

internal sealed class CreateContactCommandHandler(
    IContactRepository contacts,
    IUnitOfWork unitOfWork,
    TimeProvider clock) : IRequestHandler<CreateContactCommand, Guid>
{
    /// <summary>
    /// The value object factories are what actually build the contact, so every rule is enforced a
    /// second time on the way in — the validator only exists to report the failures politely. The id
    /// is returned because the client cannot work it out: it is minted by the domain.
    /// </summary>
    public async Task<Guid> Handle(CreateContactCommand command, CancellationToken cancellationToken)
    {
        var contact = Contact.Create(
            PersonName.Create(command.FirstName, command.Surname),
            DateOfBirth.Create(command.DateOfBirth, clock),
            Address.Create(
                command.Address.Street,
                command.Address.HouseNumber,
                command.Address.PostalCode,
                command.Address.City,
                command.Address.Country),
            PhoneNumber.Create(command.PhoneNumber),
            Iban.Create(command.Iban),
            clock);

        contacts.Add(contact);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return contact.Id.Value;
    }
}
