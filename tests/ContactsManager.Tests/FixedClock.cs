namespace ContactsManager.Tests;

/// <summary>A clock that never moves, so date rules are asserted against a known "today".</summary>
internal sealed class FixedClock(DateOnly today) : TimeProvider
{
    public static readonly DateOnly Today = new(2026, 6, 15);

    public static FixedClock AtToday() => new(Today);

    public override DateTimeOffset GetUtcNow() => new(today.ToDateTime(TimeOnly.MinValue), TimeSpan.Zero);
}
