namespace ContactsManager.Application.Features.Contacts.Contracts;

/// <summary>
/// The list shape. It carries only the masked IBAN, so the list endpoint has no full account number
/// to leak regardless of what a caller asks for.
/// </summary>
public sealed record ContactListItem(
    Guid Id,
    string FirstName,
    string Surname,
    DateOnly DateOfBirth,
    string City,
    string Country,
    string PhoneNumber,
    string IbanMasked);
