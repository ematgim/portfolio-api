FROM ollama/ollama:latest

# Copiar el Modelfile
COPY Modelfile /root/Modelfile

# Copiar script de inicialización
COPY scripts/init-ollama.sh /root/init-ollama.sh
RUN chmod +x /root/init-ollama.sh

# Exponer puerto
EXPOSE 11434

# Usar script personalizado como entrypoint
ENTRYPOINT ["/root/init-ollama.sh"]
