using ContactsManager.Domain.Contacts;
using ContactsManager.Domain.Validation;

namespace ContactsManager.Tests.Domain;

public class AddressTests
{
    [Fact]
    public void Accepts_a_complete_address()
    {
        var address = Address.Create("Keizersgracht", "241", "1016 EA", "Amsterdam", "NL");

        Assert.Equal("Keizersgracht", address.Street);
        Assert.Equal("241", address.HouseNumber);
        Assert.Equal("1016 EA", address.PostalCode);
        Assert.Equal("Amsterdam", address.City);
        Assert.Equal("NL", address.Country);
    }

    [Fact]
    public void Accepts_an_address_without_a_house_number() =>
        Assert.Equal(string.Empty, Address.Create("Rue de la Loi 16", null, "1000", "Brussels", "BE").HouseNumber);

    [Fact]
    public void Upper_cases_the_country_code() =>
        Assert.Equal("DE", Address.Create("Unter den Linden", "5", "10117", "Berlin", "de").Country);

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public void Rejects_a_blank_city(string city) =>
        Assert.Throws<DomainValidationException>(
            () => Address.Create("Keizersgracht", "241", "1016 EA", city, "NL"));

    [Theory]
    [InlineData("NLD")]
    [InlineData("N")]
    [InlineData("XX")]
    [InlineData("")]
    public void Rejects_anything_that_is_not_an_iso_two_letter_country(string country)
    {
        var error = Assert.Throws<DomainValidationException>(
            () => Address.Create("Keizersgracht", "241", "1016 EA", "Amsterdam", country));

        Assert.Contains("Country", error.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void Rejects_a_blank_street() =>
        Assert.Throws<DomainValidationException>(() => Address.Create("", "241", "1016 EA", "Amsterdam", "NL"));

    [Fact]
    public void Rejects_a_postal_code_carrying_punctuation() =>
        Assert.Throws<DomainValidationException>(
            () => Address.Create("Keizersgracht", "241", "1016_EA!", "Amsterdam", "NL"));

    [Fact]
    public void Treats_two_identical_addresses_as_equal() =>
        Assert.Equal(
            Address.Create("Keizersgracht", "241", "1016 EA", "Amsterdam", "NL"),
            Address.Create(" Keizersgracht ", " 241 ", " 1016 EA ", " Amsterdam ", " nl "));
}
