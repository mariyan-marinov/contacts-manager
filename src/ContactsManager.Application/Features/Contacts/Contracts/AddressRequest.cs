namespace ContactsManager.Application.Features.Contacts.Contracts;

public sealed record AddressRequest(
    string Street,
    string? HouseNumber,
    string PostalCode,
    string City,
    string Country);
