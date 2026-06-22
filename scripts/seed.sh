#!/usr/bin/env sh
set -e
cd "$(dirname "$0")/.."
dotnet run --project src/EquipmentApi/EquipmentApi.csproj -- seed
