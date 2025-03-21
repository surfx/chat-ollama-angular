import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { PythonRagService } from '../../services/python-rag.service';


@Component({
  selector: 'app-testes',
  imports: [CommonModule],
  templateUrl: './testes.component.html',
  styleUrl: './testes.component.scss'
})
export class TestesComponent {

  files: File[] = [];
  isDragging = false;
  uploadProgress = 0;

  constructor(private pythonRagService: PythonRagService) {

  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
    const droppedFiles = event.dataTransfer?.files;
    if (droppedFiles) {
      this.addFiles(Array.from(droppedFiles));
    }
  }

  onFileSelect(event: any): void {
    const selectedFiles = event.target.files;
    if (selectedFiles) {
      this.addFiles(Array.from(selectedFiles));
      // Limpar o valor do input para permitir selecionar o mesmo arquivo novamente
      event.target.value = '';
    }
  }

  addFiles(newFiles: File[]): void {
    const filesToAdd: File[] = [];
    for (const newFile of newFiles) {
      const isDuplicate = this.files.some(existingFile => existingFile.name === newFile.name);
      if (!isDuplicate) {
        filesToAdd.push(newFile);
      } else {
        console.warn(`Arquivo duplicado não adicionado: ${newFile.name}`);
      }
    }
    this.files = this.files.concat(filesToAdd);
  }

  onUpload(): void {
    if (this.files.length <= 0) {
      console.log("Nenhum arquivo selecionado para enviar.");
    }

    this.pythonRagService.uploadFilesRag(this.files).subscribe({
      next: (response) => {
        if (!response){
          console.error('Erro ao realizar o upload dos arquivos para análise RAG', response);
          return;
        }
        console.log(response);
        this.uploadProgress = response.porcentagem;
        console.log('this.uploadProgress: ', this.uploadProgress);
        if (this.uploadProgress >= 100) {
          this.files = [];
        }
      },
      error: (err) => {
        console.error('Erro no Upload:', err);
        this.uploadProgress = 0;

      }
    });

  }

  onClearFiles(): void {
    this.files = [];
  }

  //#region old
  //@ViewChild('appchatdisplay') appchatdisplay: ChatDisplayComponent | undefined;
  //#endregion

}