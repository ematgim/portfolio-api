#!/bin/bash

# Iniciar Ollama en background
/bin/ollama serve &
OLLAMA_PID=$!

echo "⏳ Esperando a que Ollama esté listo..."

# Esperar a que Ollama esté disponible
max_attempts=30
attempt=0
until ollama list > /dev/null 2>&1 || [ $attempt -eq $max_attempts ]; do
    attempt=$((attempt + 1))
    echo "   Intento $attempt de $max_attempts..."
    sleep 2
done

if [ $attempt -eq $max_attempts ]; then
    echo "❌ Error: Ollama no pudo iniciarse"
    exit 1
fi

echo "✅ Ollama iniciado correctamente"

# Verificar si el modelo personalizado ya existe
if ollama list | grep -q "ematgim-assistant"; then
    echo "✅ Modelo 'ematgim-assistant' ya existe"
else
    echo "📥 Descargando modelo base llama3.2..."
    ollama pull llama3.2
    
    if [ $? -eq 0 ]; then
        echo "✅ Modelo base descargado"
        echo "🔧 Creando modelo personalizado 'ematgim-assistant'..."
        ollama create ematgim-assistant -f /root/Modelfile
        
        if [ $? -eq 0 ]; then
            echo "✅ Modelo 'ematgim-assistant' creado exitosamente"
        else
            echo "❌ Error al crear el modelo personalizado"
        fi
    else
        echo "❌ Error al descargar el modelo base"
    fi
fi

echo "🎉 Sistema listo"

# Mantener el proceso principal vivo
wait $OLLAMA_PID
