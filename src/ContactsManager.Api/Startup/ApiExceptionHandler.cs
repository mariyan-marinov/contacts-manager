using ContactsManager.Application.Common;
using ContactsManager.Domain.Validation;
using FluentValidation;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ContactsManager.Api.Startup;

/// <summary>
/// Every error leaves as a ProblemDetails. Outside Development nothing carries an exception message,
/// so an internal failure cannot describe itself to a caller.
/// </summary>
internal sealed class ApiExceptionHandler(
    IProblemDetailsService problemDetails,
    IHostEnvironment environment,
    ILogger<ApiExceptionHandler> logger) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext,
        Exception exception,
        CancellationToken cancellationToken)
    {
        var problem = Describe(exception);
        httpContext.Response.StatusCode = problem.Status ?? StatusCodes.Status500InternalServerError;

        if (problem.Status >= StatusCodes.Status500InternalServerError)
        {
            logger.LogError(exception, "Unhandled {Exception} on {Path}", exception.GetType().Name, httpContext.Request.Path);
        }

        return await problemDetails.TryWriteAsync(new ProblemDetailsContext
        {
            HttpContext = httpContext,
            Exception = exception,
            ProblemDetails = problem,
        });
    }

    private ProblemDetails Describe(Exception exception) => exception switch
    {
        ValidationException validation => new HttpValidationProblemDetails(GroupByField(validation))
        {
            Status = StatusCodes.Status400BadRequest,
            Title = "One or more validation errors occurred.",
        },

        NotFoundException notFound => new ProblemDetails
        {
            Status = StatusCodes.Status404NotFound,
            Title = "Contact not found.",
            Detail = notFound.Message,
        },

        DbUpdateConcurrencyException => new ProblemDetails
        {
            Status = StatusCodes.Status409Conflict,
            Title = "The contact was changed by someone else.",
            Detail = "Reload the contact and apply your changes to the current version.",
        },

        // A broken invariant means a command validator missed something: our bug, not the caller's.
        DomainValidationException => Internal("A domain invariant was violated.", exception),

        _ => Internal("An unexpected error occurred.", exception),
    };

    private ProblemDetails Internal(string title, Exception exception) => new()
    {
        Status = StatusCodes.Status500InternalServerError,
        Title = title,
        Detail = environment.IsDevelopment() ? exception.Message : null,
    };

    private static Dictionary<string, string[]> GroupByField(ValidationException exception) =>
        exception.Errors
            .GroupBy(failure => failure.PropertyName, StringComparer.Ordinal)
            .ToDictionary(
                field => field.Key,
                field => field.Select(failure => failure.ErrorMessage).ToArray(),
                StringComparer.Ordinal);
}
