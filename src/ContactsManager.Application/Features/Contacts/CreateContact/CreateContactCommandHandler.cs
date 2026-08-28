using ContactsManager.Application.Abstractions;
using ContactsManager.Application.Messaging;
using ContactsManager.Domain.Contacts;

namespace ContactsManager.Application.Features.Contacts.CreateContact;

internal sealed class CreateContactCommandHandler(
    IContactRepository contacts,
    IUnitOfWork unitOfWork,
    TimeProvider clock) : IRequestHandler<CreateContactCommand, Guid>
{
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
