using ContactsManager.Domain.Validation;

namespace ContactsManager.Domain.Contacts;

public sealed record PhoneNumber
{
    private PhoneNumber(string value) => Value = value;

    public string Value { get; }

    public static PhoneNumber Create(string? value)
    {
        var phone = new PhoneNumber((value ?? string.Empty).Trim());
        DomainValidationException.ThrowIfInvalid(new PhoneNumberValidator().Validate(phone));
        return phone;
    }

    public override string ToString() => Value;
}
