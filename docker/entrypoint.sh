#!/bin/sh
set -e

echo "Starting application..."
exec dotnet EquipmentApi.dll
