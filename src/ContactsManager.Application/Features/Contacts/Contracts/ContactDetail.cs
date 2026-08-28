namespace ContactsManager.Application.Features.Contacts.Contracts;

/// <summary>
/// The detail shape: the only response carrying the full IBAN, and the only one carrying the version
/// a client must send back to update the contact.
/// </summary>
public sealed record ContactDetail(
    Guid Id,
    string FirstName,
    string Surname,
    DateOnly DateOfBirth,
    AddressRequest Address,
    string PhoneNumber,
    string Iban,
    uint Version);
