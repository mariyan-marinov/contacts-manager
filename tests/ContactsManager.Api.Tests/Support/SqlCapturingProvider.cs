using System.Collections.Concurrent;
using Microsoft.Extensions.Logging;

namespace ContactsManager.Api.Tests.Support;

/// <summary>
/// Collects the SQL EF actually sends, so a test can assert that filtering, ordering and paging
/// happened in the database rather than in memory.
/// </summary>
internal sealed class SqlCapturingProvider : ILoggerProvider
{
    private const string CommandCategory = "Microsoft.EntityFrameworkCore.Database.Command";

    private readonly ConcurrentQueue<string> statements = new();

    internal IReadOnlyCollection<string> Statements => statements;

    public ILogger CreateLogger(string categoryName) =>
        categoryName == CommandCategory ? new Sink(statements) : NullSink.Instance;

    public void Dispose()
    {
    }

    private sealed class Sink(ConcurrentQueue<string> statements) : ILogger
    {
        public IDisposable BeginScope<TState>(TState state)
            where TState : notnull => NullScope.Instance;

        public bool IsEnabled(LogLevel logLevel) => true;

        public void Log<TState>(
            LogLevel logLevel,
            EventId eventId,
            TState state,
            Exception? exception,
            Func<TState, Exception?, string> formatter) =>
            statements.Enqueue(formatter(state, exception));
    }

    private sealed class NullSink : ILogger
    {
        internal static readonly NullSink Instance = new();

        public IDisposable BeginScope<TState>(TState state)
            where TState : notnull => NullScope.Instance;

        public bool IsEnabled(LogLevel logLevel) => false;

        public void Log<TState>(
            LogLevel logLevel,
            EventId eventId,
            TState state,
            Exception? exception,
            Func<TState, Exception?, string> formatter)
        {
        }
    }

    private sealed class NullScope : IDisposable
    {
        internal static readonly NullScope Instance = new();

        public void Dispose()
        {
        }
    }
}
