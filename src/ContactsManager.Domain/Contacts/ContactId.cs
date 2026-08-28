namespace ContactsManager.Domain.Contacts;

public readonly record struct ContactId(Guid Value)
{
    // Version 7 is time-ordered, so freshly created contacts land next to each other in the
    // primary key index instead of scattering the way random v4 ids do.
    public static ContactId New() => new(Guid.CreateVersion7());

    public override string ToString() => Value.ToString();
}
