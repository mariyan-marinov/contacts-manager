using ContactsManager.Domain.Contacts;
using ContactsManager.Domain.Validation;

namespace ContactsManager.Tests.Domain;

public class ContactTests
{
    private static readonly TimeProvider Clock = FixedClock.AtToday();

    [Fact]
    public void Creates_a_contact_with_a_version_seven_identity()
    {
        var id = NewContact().Id.Value;

        Assert.NotEqual(Guid.Empty, id);
        Assert.Equal(7, id.ToByteArray(bigEndian: true)[6] >> 4);
    }

    [Fact]
    public void Creates_identities_that_never_go_backwards()
    {
        // Only the leading 48 bits are the timestamp; the tail is random and may sort either way
        // within the same millisecond. Big-endian because that is the order Postgres compares uuids in.
        var earlier = NewContact().Id.Value.ToByteArray(bigEndian: true).AsSpan(0, 6);
        var later = NewContact().Id.Value.ToByteArray(bigEndian: true).AsSpan(0, 6);

        Assert.True(
            earlier.SequenceCompareTo(later) <= 0,
            "the timestamp of a later contact should not precede that of an earlier one");
    }

    [Fact]
    public void Rejects_a_contact_that_is_missing_a_part()
    {
        var error = Assert.Throws<DomainValidationException>(() => Contact.Create(
            null!,
            DateOfBirth.Create(new DateOnly(1990, 3, 14), Clock),
            Address.Create("Keizersgracht", "241", "1016 EA", "Amsterdam", "NL"),
            PhoneNumber.Create("+31 6 1234 5678"),
            Iban.Create("NL91ABNA0417164300"),
            Clock));

        Assert.Contains("Name", error.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void Renames_without_touching_anything_else()
    {
        var contact = NewContact();

        contact.Rename(PersonName.Create("Anne-Marie", "O'Brien"));

        Assert.Equal("Anne-Marie O'Brien", contact.Name.ToString());
        Assert.Equal("NL91ABNA0417164300", contact.Iban.Value);
    }

    [Fact]
    public void Moves_to_a_new_address()
    {
        var contact = NewContact();

        contact.MoveTo(Address.Create("Unter den Linden", "5", "10117", "Berlin", "DE"));

        Assert.Equal("Berlin", contact.Address.City);
    }

    [Fact]
    public void Changes_the_phone_number_and_the_iban()
    {
        var contact = NewContact();

        contact.ChangePhone(PhoneNumber.Create("(020) 123-4567"));
        contact.ChangeIban(Iban.Create("DE89370400440532013000"));

        Assert.Equal("(020) 123-4567", contact.Phone.Value);
        Assert.Equal("DE89****3000", contact.Iban.Masked);
    }

    [Fact]
    public void Corrects_a_date_of_birth_that_was_entered_wrongly()
    {
        var contact = NewContact();

        contact.CorrectDateOfBirth(DateOfBirth.Create(new DateOnly(1991, 3, 14), Clock));

        Assert.Equal(new DateOnly(1991, 3, 14), contact.DateOfBirth.Value);
    }

    [Fact]
    public void Reports_the_age_of_the_person_it_describes() =>
        Assert.Equal(36, NewContact().AgeOn(FixedClock.Today));

    [Fact]
    public void Refuses_a_null_replacement() =>
        Assert.Throws<ArgumentNullException>(() => NewContact().ChangeIban(null!));

    private static Contact NewContact() => Contact.Create(
        PersonName.Create("Mariyan", "Marinov"),
        DateOfBirth.Create(new DateOnly(1990, 3, 14), Clock),
        Address.Create("Keizersgracht", "241", "1016 EA", "Amsterdam", "NL"),
        PhoneNumber.Create("+31 6 1234 5678"),
        Iban.Create("NL91ABNA0417164300"),
        Clock);
}
