using ContactsManager.Domain.Contacts;
using ContactsManager.Domain.Validation;

namespace ContactsManager.Tests.Domain;

public class PersonNameTests
{
    [Theory]
    [InlineData("José", "García")]
    [InlineData("Anne-Marie", "O'Brien")]
    [InlineData("Jan", "van der Berg")]
    [InlineData("Þórunn", "Jónsdóttir")]
    public void Accepts_names_as_people_actually_spell_them(string first, string surname)
    {
        var name = PersonName.Create(first, surname);

        Assert.Equal(first, name.First);
        Assert.Equal(surname, name.Surname);
    }

    [Fact]
    public void Trims_surrounding_whitespace() =>
        Assert.Equal("Mariyan", PersonName.Create("  Mariyan  ", "Marinov").First);

    [Theory]
    [InlineData("", "Marinov")]
    [InlineData("Mariyan", "")]
    [InlineData("   ", "Marinov")]
    public void Rejects_a_missing_half_of_the_name(string first, string surname) =>
        Assert.Throws<DomainValidationException>(() => PersonName.Create(first, surname));

    [Theory]
    [InlineData("John3")]
    [InlineData("<script>")]
    [InlineData("O'Brien; drop table contacts")]
    public void Rejects_digits_and_punctuation_that_do_not_belong_in_a_name(string first) =>
        Assert.Throws<DomainValidationException>(() => PersonName.Create(first, "Marinov"));

    [Fact]
    public void Rejects_a_name_longer_than_fifty_characters() =>
        Assert.Throws<DomainValidationException>(() => PersonName.Create(new string('a', 51), "Marinov"));

    [Fact]
    public void Reads_as_the_full_name() =>
        Assert.Equal("Mariyan Marinov", PersonName.Create("Mariyan", "Marinov").ToString());
}
