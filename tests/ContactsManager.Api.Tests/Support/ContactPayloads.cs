namespace ContactsManager.Api.Tests.Support;

internal sealed record AddressPayload(
    string Street,
    string HouseNumber,
    string PostalCode,
    string City,
    string Country);

internal sealed record ContactPayload(
    string FirstName,
    string Surname,
    string DateOfBirth,
    AddressPayload Address,
    string PhoneNumber,
    string Iban)
{
    /// <summary>The same contact plus the version the caller last read, which is what PUT requires.</summary>
    internal UpdatePayload WithVersion(uint version) =>
        new(FirstName, Surname, DateOfBirth, Address, PhoneNumber, Iban, version);
}

internal sealed record UpdatePayload(
    string FirstName,
    string Surname,
    string DateOfBirth,
    AddressPayload Address,
    string PhoneNumber,
    string Iban,
    uint Version);

internal static class ContactPayloads
{
    internal static ContactPayload Valid(
        string firstName = "Wilhelmina",
        string surname = "Zwart",
        string dateOfBirth = "1991-02-17",
        string phoneNumber = "+31 6 5544 3322",
        string iban = "NL91ABNA0417164300") =>
        new(
            firstName,
            surname,
            dateOfBirth,
            new AddressPayload("Prinsengracht", "12", "1015 DV", "Amsterdam", "NL"),
            phoneNumber,
            iban);
}
