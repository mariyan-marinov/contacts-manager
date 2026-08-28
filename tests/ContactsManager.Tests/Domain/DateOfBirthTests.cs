using ContactsManager.Domain.Contacts;
using ContactsManager.Domain.Validation;

namespace ContactsManager.Tests.Domain;

public class DateOfBirthTests
{
    private static readonly TimeProvider Clock = FixedClock.AtToday();

    [Fact]
    public void Accepts_a_date_in_the_past() =>
        Assert.Equal(new DateOnly(1990, 3, 14), DateOfBirth.Create(new DateOnly(1990, 3, 14), Clock).Value);

    [Fact]
    public void Accepts_someone_born_today() =>
        Assert.Equal(FixedClock.Today, DateOfBirth.Create(FixedClock.Today, Clock).Value);

    [Fact]
    public void Rejects_tomorrow()
    {
        var error = Assert.Throws<DomainValidationException>(
            () => DateOfBirth.Create(FixedClock.Today.AddDays(1), Clock));

        Assert.Contains("future", error.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void Accepts_exactly_one_hundred_and_thirty_years_ago() =>
        Assert.Equal(
            FixedClock.Today.AddYears(-130),
            DateOfBirth.Create(FixedClock.Today.AddYears(-130), Clock).Value);

    [Fact]
    public void Rejects_one_day_beyond_one_hundred_and_thirty_years() =>
        Assert.Throws<DomainValidationException>(
            () => DateOfBirth.Create(FixedClock.Today.AddYears(-130).AddDays(-1), Clock));

    [Fact]
    public void Reports_the_age_reached_on_the_birthday()
    {
        var dateOfBirth = DateOfBirth.Create(new DateOnly(1990, 6, 15), Clock);

        Assert.Equal(36, dateOfBirth.AgeOn(FixedClock.Today));
    }

    [Fact]
    public void Still_reports_the_previous_age_the_day_before_the_birthday()
    {
        var dateOfBirth = DateOfBirth.Create(new DateOnly(1990, 6, 16), Clock);

        Assert.Equal(35, dateOfBirth.AgeOn(FixedClock.Today));
    }

    [Fact]
    public void Treats_a_leap_day_birthday_as_falling_on_the_first_of_march()
    {
        var dateOfBirth = DateOfBirth.Create(new DateOnly(2000, 2, 29), Clock);

        Assert.Equal(25, dateOfBirth.AgeOn(new DateOnly(2026, 2, 28)));
        Assert.Equal(26, dateOfBirth.AgeOn(new DateOnly(2026, 3, 1)));
        // 2024 is a leap year, so the birthday genuinely falls on the 29th that year
        Assert.Equal(23, dateOfBirth.AgeOn(new DateOnly(2024, 2, 28)));
        Assert.Equal(24, dateOfBirth.AgeOn(new DateOnly(2024, 2, 29)));
    }
}
