using AnalyticsDashboard.Api.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AnalyticsDashboard.Api.Migrations;

[DbContext(typeof(AnalyticsDbContext))]
[Migration("20260818090000_UseUsernames")]
public sealed class UseUsernames : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.RenameColumn(
            name: "email",
            table: "app_users",
            newName: "username");
        migrationBuilder.RenameColumn(
            name: "normalized_email",
            table: "app_users",
            newName: "normalized_username");
        migrationBuilder.RenameIndex(
            name: "ux_app_users_normalized_email",
            table: "app_users",
            newName: "ux_app_users_normalized_username");
        migrationBuilder.AlterColumn<string>(
            name: "username",
            table: "app_users",
            type: "character varying(80)",
            maxLength: 80,
            nullable: false,
            oldClrType: typeof(string),
            oldType: "character varying(320)",
            oldMaxLength: 320);
        migrationBuilder.AlterColumn<string>(
            name: "normalized_username",
            table: "app_users",
            type: "character varying(80)",
            maxLength: 80,
            nullable: false,
            oldClrType: typeof(string),
            oldType: "character varying(320)",
            oldMaxLength: 320);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AlterColumn<string>(
            name: "username",
            table: "app_users",
            type: "character varying(320)",
            maxLength: 320,
            nullable: false,
            oldClrType: typeof(string),
            oldType: "character varying(80)",
            oldMaxLength: 80);
        migrationBuilder.AlterColumn<string>(
            name: "normalized_username",
            table: "app_users",
            type: "character varying(320)",
            maxLength: 320,
            nullable: false,
            oldClrType: typeof(string),
            oldType: "character varying(80)",
            oldMaxLength: 80);
        migrationBuilder.RenameIndex(
            name: "ux_app_users_normalized_username",
            table: "app_users",
            newName: "ux_app_users_normalized_email");
        migrationBuilder.RenameColumn(
            name: "username",
            table: "app_users",
            newName: "email");
        migrationBuilder.RenameColumn(
            name: "normalized_username",
            table: "app_users",
            newName: "normalized_email");
    }
}
