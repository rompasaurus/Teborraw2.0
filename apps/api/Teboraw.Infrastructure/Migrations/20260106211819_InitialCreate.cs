using System;
using System.Collections.Generic;
using System.Text.Json;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Teboraw.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Users",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Email = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    PasswordHash = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    DisplayName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    AvatarUrl = table.Column<string>(type: "text", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Users", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Activities",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Type = table.Column<int>(type: "integer", nullable: false),
                    Source = table.Column<int>(type: "integer", nullable: false),
                    Timestamp = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Data = table.Column<JsonDocument>(type: "jsonb", nullable: true),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Activities", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Activities_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "RefreshTokens",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Token = table.Column<string>(type: "text", nullable: false),
                    ExpiresAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    IsRevoked = table.Column<bool>(type: "boolean", nullable: false),
                    ReplacedByToken = table.Column<string>(type: "text", nullable: true),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RefreshTokens", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RefreshTokens_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Thoughts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Content = table.Column<string>(type: "text", nullable: false),
                    Tags = table.Column<List<string>>(type: "text[]", nullable: false),
                    LinkedActivityIds = table.Column<List<Guid>>(type: "uuid[]", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Thoughts", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Thoughts_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "UserSettings",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    DesktopTrackingEnabled = table.Column<bool>(type: "boolean", nullable: false),
                    BrowserTrackingEnabled = table.Column<bool>(type: "boolean", nullable: false),
                    LocationTrackingEnabled = table.Column<bool>(type: "boolean", nullable: false),
                    AudioTrackingEnabled = table.Column<bool>(type: "boolean", nullable: false),
                    ScreenshotIntervalSeconds = table.Column<int>(type: "integer", nullable: false),
                    LocationIntervalSeconds = table.Column<int>(type: "integer", nullable: false),
                    IdleThresholdSeconds = table.Column<int>(type: "integer", nullable: false),
                    ExcludedApps = table.Column<List<string>>(type: "text[]", nullable: false),
                    ExcludedDomains = table.Column<List<string>>(type: "text[]", nullable: false),
                    BlurScreenshots = table.Column<bool>(type: "boolean", nullable: false),
                    DataRetentionDays = table.Column<int>(type: "integer", nullable: false),
                    DailySummaryEnabled = table.Column<bool>(type: "boolean", nullable: false),
                    WeeklySummaryEnabled = table.Column<bool>(type: "boolean", nullable: false),
                    SyncAlertsEnabled = table.Column<bool>(type: "boolean", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserSettings", x => x.Id);
                    table.ForeignKey(
                        name: "FK_UserSettings_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AudioRecordings",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    FilePath = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    DurationSeconds = table.Column<int>(type: "integer", nullable: false),
                    Transcript = table.Column<string>(type: "text", nullable: true),
                    TranscriptionStatus = table.Column<int>(type: "integer", nullable: false),
                    RecordedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ActivityId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AudioRecordings", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AudioRecordings_Activities_ActivityId",
                        column: x => x.ActivityId,
                        principalTable: "Activities",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "DesktopSessions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    AppName = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    WindowTitle = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    DurationSeconds = table.Column<int>(type: "integer", nullable: false),
                    StartTime = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    EndTime = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ActivityId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DesktopSessions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DesktopSessions_Activities_ActivityId",
                        column: x => x.ActivityId,
                        principalTable: "Activities",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Locations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Latitude = table.Column<double>(type: "double precision", nullable: false),
                    Longitude = table.Column<double>(type: "double precision", nullable: false),
                    Accuracy = table.Column<double>(type: "double precision", nullable: false),
                    Altitude = table.Column<double>(type: "double precision", nullable: true),
                    Speed = table.Column<double>(type: "double precision", nullable: true),
                    Heading = table.Column<double>(type: "double precision", nullable: true),
                    RecordedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ActivityId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Locations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Locations_Activities_ActivityId",
                        column: x => x.ActivityId,
                        principalTable: "Activities",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "PageVisits",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Url = table.Column<string>(type: "character varying(2048)", maxLength: 2048, nullable: false),
                    Title = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    Domain = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    DurationSeconds = table.Column<int>(type: "integer", nullable: false),
                    VisitedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ActivityId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PageVisits", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PageVisits_Activities_ActivityId",
                        column: x => x.ActivityId,
                        principalTable: "Activities",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Screenshots",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    FilePath = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    ThumbnailPath = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    Width = table.Column<int>(type: "integer", nullable: false),
                    Height = table.Column<int>(type: "integer", nullable: false),
                    CapturedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ActivityId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Screenshots", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Screenshots_Activities_ActivityId",
                        column: x => x.ActivityId,
                        principalTable: "Activities",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "SearchQueries",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Query = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    Engine = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    SearchedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ActivityId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SearchQueries", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SearchQueries_Activities_ActivityId",
                        column: x => x.ActivityId,
                        principalTable: "Activities",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Activities_Source",
                table: "Activities",
                column: "Source");

            migrationBuilder.CreateIndex(
                name: "IX_Activities_Type",
                table: "Activities",
                column: "Type");

            migrationBuilder.CreateIndex(
                name: "IX_Activities_UserId_Timestamp",
                table: "Activities",
                columns: new[] { "UserId", "Timestamp" });

            migrationBuilder.CreateIndex(
                name: "IX_AudioRecordings_ActivityId",
                table: "AudioRecordings",
                column: "ActivityId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_DesktopSessions_ActivityId",
                table: "DesktopSessions",
                column: "ActivityId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_DesktopSessions_AppName",
                table: "DesktopSessions",
                column: "AppName");

            migrationBuilder.CreateIndex(
                name: "IX_Locations_ActivityId",
                table: "Locations",
                column: "ActivityId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Locations_RecordedAt",
                table: "Locations",
                column: "RecordedAt");

            migrationBuilder.CreateIndex(
                name: "IX_PageVisits_ActivityId",
                table: "PageVisits",
                column: "ActivityId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PageVisits_Domain",
                table: "PageVisits",
                column: "Domain");

            migrationBuilder.CreateIndex(
                name: "IX_RefreshTokens_Token",
                table: "RefreshTokens",
                column: "Token",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_RefreshTokens_UserId",
                table: "RefreshTokens",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_Screenshots_ActivityId",
                table: "Screenshots",
                column: "ActivityId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_SearchQueries_ActivityId",
                table: "SearchQueries",
                column: "ActivityId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Thoughts_UserId",
                table: "Thoughts",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_Users_Email",
                table: "Users",
                column: "Email",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_UserSettings_UserId",
                table: "UserSettings",
                column: "UserId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AudioRecordings");

            migrationBuilder.DropTable(
                name: "DesktopSessions");

            migrationBuilder.DropTable(
                name: "Locations");

            migrationBuilder.DropTable(
                name: "PageVisits");

            migrationBuilder.DropTable(
                name: "RefreshTokens");

            migrationBuilder.DropTable(
                name: "Screenshots");

            migrationBuilder.DropTable(
                name: "SearchQueries");

            migrationBuilder.DropTable(
                name: "Thoughts");

            migrationBuilder.DropTable(
                name: "UserSettings");

            migrationBuilder.DropTable(
                name: "Activities");

            migrationBuilder.DropTable(
                name: "Users");
        }
    }
}
