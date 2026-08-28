using ContactsManager.Application.Features.Contacts.Contracts;
using ContactsManager.Application.Messaging;

namespace ContactsManager.Application.Features.Contacts.CreateContact;

public sealed record CreateContactCommand(
    string FirstName,
    string Surname,
    DateOnly DateOfBirth,
    AddressRequest Address,
    string PhoneNumber,
    string Iban) : ICommand<Guid>;
