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

    /// <summary>
    /// Whole years completed. The subtraction of years alone counts a birthday that has not arrived
    /// yet, so the year is given back when today falls before it.
    /// </summary>
    public int AgeOn(DateOnly today)
    {
        var age = today.Year - Value.Year;
        return Value > today.AddYears(-age) ? age - 1 : age;
    }

    /// <summary>
    /// The one place a clock becomes a calendar date. UTC throughout, so nobody's date of birth
    /// depends on which side of midnight the server happens to be.
    /// </summary>
    public static DateOnly Today(TimeProvider clock) => DateOnly.FromDateTime(clock.GetUtcNow().UtcDateTime);

    public override string ToString() => Value.ToString("O");
}
