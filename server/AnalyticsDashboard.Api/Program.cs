using Amazon.S3;
using Amazon.Runtime;
using AnalyticsDashboard.Api.Data;
using AnalyticsDashboard.Api.Auth;
using AnalyticsDashboard.Api.Data.Entities;
using AnalyticsDashboard.Api.Services;
using AnalyticsDashboard.Api.Storage;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

var connectionString = builder.Configuration.GetConnectionString("AnalyticsDatabase");
if (string.IsNullOrWhiteSpace(connectionString))
{
    throw new InvalidOperationException(
        "Connection string 'AnalyticsDatabase' is not configured. " +
        "Set ConnectionStrings__AnalyticsDatabase in the environment.");
}

var jwtOptions = builder.Configuration
    .GetSection(JwtOptions.SectionName)
    .Get<JwtOptions>() ?? new JwtOptions();
if (Encoding.UTF8.GetByteCount(jwtOptions.SigningKey) < 32)
{
    throw new InvalidOperationException(
        "Jwt:SigningKey must be configured with at least 32 bytes. " +
        "Set Jwt__SigningKey in the environment.");
}

var datasetStorageOptions = builder.Configuration
    .GetSection(DatasetStorageOptions.SectionName)
    .Get<DatasetStorageOptions>() ?? new DatasetStorageOptions();

builder.Services.AddProblemDetails();
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddHealthChecks();
builder.Services.AddSingleton(TimeProvider.System);
builder.Services.Configure<JwtOptions>(
    builder.Configuration.GetSection(JwtOptions.SectionName));
builder.Services.AddScoped<IPasswordHasher<AppUser>, PasswordHasher<AppUser>>();
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = jwtOptions.Issuer,
            ValidateAudience = true,
            ValidAudience = jwtOptions.Audience,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(jwtOptions.SigningKey)),
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromMinutes(1)
        };
    });
builder.Services.AddAuthorization();
builder.Services.AddDbContext<AnalyticsDbContext>(options =>
    options.UseNpgsql(connectionString));
builder.Services.AddScoped<DatasetService>();
builder.Services.AddScoped<DatasetFileService>();
builder.Services.AddScoped<AuthService>();
builder.Services.AddSingleton<CsvInspector>();
builder.Services.Configure<DatasetStorageOptions>(
    builder.Configuration.GetSection(DatasetStorageOptions.SectionName));
builder.Services.Configure<S3DatasetStorageOptions>(
    builder.Configuration.GetSection(S3DatasetStorageOptions.SectionName));

if (string.Equals(datasetStorageOptions.Provider, "S3", StringComparison.OrdinalIgnoreCase))
{
    var s3Options = builder.Configuration
        .GetSection(S3DatasetStorageOptions.SectionName)
        .Get<S3DatasetStorageOptions>() ?? new S3DatasetStorageOptions();
    if (string.IsNullOrWhiteSpace(s3Options.ServiceUrl) ||
        string.IsNullOrWhiteSpace(s3Options.BucketName) ||
        string.IsNullOrWhiteSpace(s3Options.AccessKeyId) ||
        string.IsNullOrWhiteSpace(s3Options.SecretAccessKey))
    {
        throw new InvalidOperationException(
            "S3 dataset storage requires ServiceUrl, BucketName, AccessKeyId, and SecretAccessKey.");
    }

    builder.Services.AddSingleton<IAmazonS3>(_ => new AmazonS3Client(
        new BasicAWSCredentials(s3Options.AccessKeyId, s3Options.SecretAccessKey),
        new AmazonS3Config
        {
            ServiceURL = s3Options.ServiceUrl,
            AuthenticationRegion = s3Options.Region,
            ForcePathStyle = true
        }));
    builder.Services.AddSingleton<IDatasetFileStorage, S3DatasetFileStorage>();
}
else if (string.Equals(
             datasetStorageOptions.Provider,
             "Local",
             StringComparison.OrdinalIgnoreCase))
{
    builder.Services.AddSingleton<IDatasetFileStorage, LocalDatasetFileStorage>();
}
else
{
    throw new InvalidOperationException(
        "DatasetStorage:Provider must be either 'Local' or 'S3'.");
}

var allowedOrigins = builder.Configuration
    .GetSection("Cors:AllowedOrigins")
    .Get<string[]>() ?? [];

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        if (allowedOrigins.Length > 0)
        {
            policy.WithOrigins(allowedOrigins)
                .AllowAnyHeader()
                .AllowAnyMethod();
        }
    });
});

var app = builder.Build();

app.UseExceptionHandler();
app.UseCors();
app.UseAuthentication();
app.UseAuthorization();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

if (builder.Configuration.GetValue("Database:ApplyMigrationsOnStartup", true))
{
    await using var scope = app.Services.CreateAsyncScope();
    var database = scope.ServiceProvider.GetRequiredService<AnalyticsDbContext>();
    await database.Database.MigrateAsync();
}

app.MapHealthChecks("/health");
app.MapControllers();

await app.RunAsync();

public partial class Program;
