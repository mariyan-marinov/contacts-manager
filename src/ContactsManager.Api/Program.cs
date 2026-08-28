using ContactsManager.Api.Startup;
using ContactsManager.Application;
using ContactsManager.Infrastructure;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddOpenApi();
builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration.GetConnectionString("Contacts")
    ?? throw new InvalidOperationException("Connection string 'Contacts' is not configured."));

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

await app.MigrateAndSeedAsync();

app.MapControllers();

await app.RunAsync();

/// <summary>Named so the API test project can reach the entry point through WebApplicationFactory.</summary>
public partial class Program;
