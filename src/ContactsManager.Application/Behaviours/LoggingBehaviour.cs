using System.Diagnostics;
using ContactsManager.Application.Messaging;
using Microsoft.Extensions.Logging;

namespace ContactsManager.Application.Behaviours;

internal sealed class LoggingBehaviour<TRequest, TResponse>(ILogger<LoggingBehaviour<TRequest, TResponse>> logger)
    : IPipelineBehaviour<TRequest, TResponse>
    where TRequest : IRequest<TResponse>
{
    public async Task<TResponse> Handle(
        TRequest request,
        RequestHandlerDelegate<TResponse> next,
        CancellationToken cancellationToken)
    {
        var requestName = typeof(TRequest).Name;
        var stopwatch = Stopwatch.StartNew();

        try
        {
            var response = await next();
            logger.LogInformation("{Request} succeeded in {Elapsed} ms", requestName, stopwatch.ElapsedMilliseconds);
            return response;
        }
        catch (Exception exception)
        {
            logger.LogWarning(
                exception,
                "{Request} failed after {Elapsed} ms",
                requestName,
                stopwatch.ElapsedMilliseconds);
            throw;
        }
    }
}
