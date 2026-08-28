using ContactsManager.Domain.Validation;

namespace ContactsManager.Domain.Contacts;

public sealed record Address
{
    private Address(string street, string houseNumber, string postalCode, string city, string country)
    {
        Street = street;
        HouseNumber = houseNumber;
        PostalCode = postalCode;
        City = city;
        Country = country;
    }

    public string Street { get; }

    /// <summary>Optional: plenty of addresses carry the number inside the street line.</summary>
    public string HouseNumber { get; }

    public string PostalCode { get; }

    public string City { get; }

    /// <summary>ISO 3166-1 alpha-2, upper-cased on the way in.</summary>
    public string Country { get; }

    public static Address Create(string? street, string? houseNumber, string? postalCode, string? city, string? country)
    {
        var address = new Address(
            (street ?? string.Empty).Trim(),
            (houseNumber ?? string.Empty).Trim(),
            (postalCode ?? string.Empty).Trim(),
            (city ?? string.Empty).Trim(),
            (country ?? string.Empty).Trim().ToUpperInvariant());

        DomainValidationException.ThrowIfInvalid(new AddressValidator().Validate(address));
        return address;
    }

    public override string ToString() =>
        string.Join(", ", new[] { $"{Street} {HouseNumber}".Trim(), $"{PostalCode} {City}".Trim(), Country });
}
