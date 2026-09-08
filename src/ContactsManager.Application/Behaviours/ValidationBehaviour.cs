using ContactsManager.Application.Messaging;
using FluentValidation;
using FluentValidation.Results;

namespace ContactsManager.Application.Behaviours;

/// <summary>
/// Runs every validator registered for the request before the handler sees it, so a handler can take
/// its input as given and the domain's own invariant checks stay a safety net rather than a gate.
/// </summary>
internal sealed class ValidationBehaviour<TRequest, TResponse>(IEnumerable<IValidator<TRequest>> validators)
    : IPipelineBehaviour<TRequest, TResponse>
    where TRequest : IRequest<TResponse>
{
    public async Task<TResponse> Handle(
        TRequest request,
        RequestHandlerDelegate<TResponse> next,
        CancellationToken cancellationToken)
    {
        var failures = new List<ValidationFailure>();

        foreach (var validator in validators)
        {
            var result = await validator.ValidateAsync(request, cancellationToken);
            failures.AddRange(result.Errors);
        }

        // Every failure at once: a form should not surface its problems one round trip at a time.
        if (failures.Count > 0)
        {
            throw new ValidationException(failures);
        }

        return await next();
    }
}
