using ContactsManager.Domain.Validation;

namespace ContactsManager.Domain.Contacts;

public sealed class Contact
{
    /// <summary>
    /// For EF Core only. Complex properties cannot be bound to constructor parameters, so the
    /// materialiser needs an empty door; it assigns every property immediately afterwards, which is
    /// what the null-forgiving operators stand for. It stays private, so no caller can reach it.
    /// </summary>
    private Contact()
    {
        Name = null!;
        DateOfBirth = null!;
        Address = null!;
        Phone = null!;
        Iban = null!;
    }

    private Contact(
        ContactId id,
        PersonName name,
        DateOfBirth dateOfBirth,
        Address address,
        PhoneNumber phone,
        Iban iban)
    {
        Id = id;
        Name = name;
        DateOfBirth = dateOfBirth;
        Address = address;
        Phone = phone;
        Iban = iban;
    }

    public ContactId Id { get; private set; }

    /// <summary>
    /// Postgres already maintains a per-row version in its `xmin` system column, so optimistic
    /// concurrency costs no column of our own. This is the one persistence-shaped property the
    /// aggregate carries: the API hands it to clients so a stale update can be rejected rather than
    /// silently overwriting someone else's edit.
    /// </summary>
    public uint Version { get; private set; }

    public PersonName Name { get; private set; }

    public DateOfBirth DateOfBirth { get; private set; }

    public Address Address { get; private set; }

    public PhoneNumber Phone { get; private set; }

    public Iban Iban { get; private set; }

    public static Contact Create(
        PersonName name,
        DateOfBirth dateOfBirth,
        Address address,
        PhoneNumber phone,
        Iban iban,
        TimeProvider clock)
    {
        var contact = new Contact(ContactId.New(), name, dateOfBirth, address, phone, iban);
        DomainValidationException.ThrowIfInvalid(new ContactValidator(DateOfBirth.Today(clock)).Validate(contact));
        return contact;
    }

    public void Rename(PersonName name)
    {
        ArgumentNullException.ThrowIfNull(name);
        Name = name;
    }

    public void MoveTo(Address address)
    {
        ArgumentNullException.ThrowIfNull(address);
        Address = address;
    }

    public void ChangePhone(PhoneNumber phone)
    {
        ArgumentNullException.ThrowIfNull(phone);
        Phone = phone;
    }

    public void ChangeIban(Iban iban)
    {
        ArgumentNullException.ThrowIfNull(iban);
        Iban = iban;
    }

    public void CorrectDateOfBirth(DateOfBirth dateOfBirth)
    {
        ArgumentNullException.ThrowIfNull(dateOfBirth);
        DateOfBirth = dateOfBirth;
    }

    public int AgeOn(DateOnly today) => DateOfBirth.AgeOn(today);
}
