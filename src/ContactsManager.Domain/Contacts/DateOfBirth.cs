using ContactsManager.Domain.Validation;

namespace ContactsManager.Domain.Contacts;

public sealed record DateOfBirth
{
    private DateOfBirth(DateOnly value) => Value = value;

    public DateOnly Value { get; }

    public static DateOfBirth Create(DateOnly value, TimeProvider clock)
    {
        var dateOfBirth = new DateOfBirth(value);
        DomainValidationException.ThrowIfInvalid(new DateOfBirthValidator(Today(clock)).Validate(dateOfBirth));
        return dateOfBirth;
    }

    public int AgeOn(DateOnly today)
    {
        var age = today.Year - Value.Year;
        return Value > today.AddYears(-age) ? age - 1 : age;
    }

    public static DateOnly Today(TimeProvider clock) => DateOnly.FromDateTime(clock.GetUtcNow().UtcDateTime);

    public override string ToString() => Value.ToString("O");
}
