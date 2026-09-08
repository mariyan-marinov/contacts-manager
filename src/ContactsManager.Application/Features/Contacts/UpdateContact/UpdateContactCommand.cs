using ContactsManager.Application.Features.Contacts.Contracts;
using ContactsManager.Application.Messaging;

namespace ContactsManager.Application.Features.Contacts.UpdateContact;

/// <summary><see cref="Version"/> is the value the client last read, and what makes a stale write fail.</summary>
public sealed record UpdateContactCommand(
    Guid Id,
    string FirstName,
    string Surname,
    DateOnly DateOfBirth,
    ContactAddress Address,
    string PhoneNumber,
    string Iban,
    uint Version) : ICommand<Unit>;
