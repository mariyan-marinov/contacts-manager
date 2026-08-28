using ContactsManager.Domain.Contacts;
using ContactsManager.Domain.Validation;

namespace ContactsManager.Tests.Domain;

public class PhoneNumberTests
{
    [Theory]
    [InlineData("+31 6 1234 5678")]
    [InlineData("(020) 123-4567")]
    [InlineData("020-1234567")]
    [InlineData("+441632960961")]
    [InlineData("06 12345678")]
    public void Accepts_the_shapes_people_actually_type(string typed) =>
        Assert.Equal(typed, PhoneNumber.Create(typed).Value);

    [Fact]
    public void Keeps_the_number_exactly_as_entered() =>
        Assert.Equal("+31 6 1234 5678", PhoneNumber.Create("  +31 6 1234 5678  ").Value);

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("call me")]
    [InlineData("+31 6 EXT 5678")]
    public void Rejects_anything_containing_letters_or_nothing_at_all(string value) =>
        Assert.Throws<DomainValidationException>(() => PhoneNumber.Create(value));

    [Fact]
    public void Rejects_a_number_that_is_too_short() =>
        Assert.Throws<DomainValidationException>(() => PhoneNumber.Create("12345"));

    [Fact]
    public void Rejects_punctuation_padded_out_to_look_long_enough()
    {
        var error = Assert.Throws<DomainValidationException>(() => PhoneNumber.Create("(--) () --12"));

        Assert.Contains("digits", error.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void Rejects_a_number_longer_than_twenty_characters() =>
        Assert.Throws<DomainValidationException>(() => PhoneNumber.Create("+31 (0) 6 1234 5678 90"));
}
