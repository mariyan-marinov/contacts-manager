namespace ContactsManager.Application.Features.Contacts.Contracts;

public sealed record ContactAddress(
    string Street,
    string? HouseNumber,
    string PostalCode,
    string City,
    string Country);
