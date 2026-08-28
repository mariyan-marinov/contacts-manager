namespace ContactsManager.Application.Common;

/// <summary>Page count is the client's arithmetic; the server reports what it knows.</summary>
public sealed record PagedResult<T>(IReadOnlyList<T> Items, int Total, int Page, int Size);
