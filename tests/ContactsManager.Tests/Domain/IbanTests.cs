using ContactsManager.Domain.Contacts;
using ContactsManager.Domain.Validation;

namespace ContactsManager.Tests.Domain;

public class IbanTests
{
    [Theory]
    [InlineData("NL91ABNA0417164300")]
    [InlineData("DE89370400440532013000")]
    [InlineData("GB82WEST12345698765432")]
    [InlineData("BE68539007547034")]
    [InlineData("FR1420041010050500013M02606")]
    [InlineData("ES9121000418450200051332")]
    [InlineData("CH9300762011623852957")]
    public void Accepts_a_valid_iban_from_any_country(string value)
    {
        var iban = Iban.Create(value);

        Assert.Equal(value, iban.Value);
    }

    [Theory]
    [InlineData("NL91ABNA0417164301")]
    [InlineData("DE89370400440532013001")]
    [InlineData("GB82WEST12345698765433")]
    public void Rejects_an_iban_whose_checksum_does_not_add_up(string value)
    {
        var error = Assert.Throws<DomainValidationException>(() => Iban.Create(value));

        Assert.Contains("checksum", error.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Theory]
    [InlineData("nl91 abna 0417 1643 00")]
    [InlineData("NL91 ABNA 0417 1643 00")]
    [InlineData("  nl91abna0417164300  ")]
    public void Strips_spacing_and_upper_cases_on_the_way_in(string typed)
    {
        var iban = Iban.Create(typed);

        Assert.Equal("NL91ABNA0417164300", iban.Value);
    }

    [Fact]
    public void Masks_all_but_the_first_and_last_four_characters()
    {
        var iban = Iban.Create("NL91ABNA0417164300");

        Assert.Equal("NL91****4300", iban.Masked);
    }

    [Fact]
    public void Masks_to_the_same_width_regardless_of_length()
    {
        var shorter = Iban.Create("BE68539007547034");
        var longer = Iban.Create("FR1420041010050500013M02606");

        Assert.Equal(shorter.Masked.Length, longer.Masked.Length);
    }

    [Theory]
    [InlineData("")]
    [InlineData("NL91ABNA041")]
    [InlineData("NL91ABNA04171643001234567890123456789")]
    [InlineData("1191ABNA0417164300")]
    [InlineData("NLX1ABNA0417164300")]
    public void Rejects_anything_not_shaped_like_an_iban(string value) =>
        Assert.Throws<DomainValidationException>(() => Iban.Create(value));

    [Fact]
    public void Treats_two_spellings_of_the_same_account_as_equal() =>
        Assert.Equal(Iban.Create("nl91 abna 0417 1643 00"), Iban.Create("NL91ABNA0417164300"));
}
