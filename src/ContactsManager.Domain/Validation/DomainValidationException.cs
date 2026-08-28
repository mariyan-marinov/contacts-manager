using FluentValidation.Results;

namespace ContactsManager.Domain.Validation;

/// <summary>
/// Thrown when a domain type is asked to hold a value that breaks its own invariants. Reaching this
/// from an HTTP request means a command validator was missed, so the API maps it to a 500 rather
/// than a 400.
/// </summary>
public sealed class DomainValidationException : Exception
{
    public DomainValidationException(IEnumerable<ValidationFailure> failures)
        : base(Describe(failures))
    {
        Failures = failures.ToArray();
    }

    public IReadOnlyCollection<ValidationFailure> Failures { get; }

    public static void ThrowIfInvalid(ValidationResult result)
    {
        if (!result.IsValid)
        {
            throw new DomainValidationException(result.Errors);
        }
    }

    private static string Describe(IEnumerable<ValidationFailure> failures) =>
        string.Join(" ", failures.Select(failure => $"{failure.PropertyName}: {failure.ErrorMessage}"));
}
