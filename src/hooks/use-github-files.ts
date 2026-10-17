import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { callMCPTool, type MCPToolResponse } from '@/sdk/core/mcp-client';

/**
 * GitHub repository content item
 */
export interface GitHubContent {
  name: string;
  path: string;
  sha: string;
  size: number;
  url: string;
  html_url: string;
  git_url: string;
  download_url: string | null;
  type: 'file' | 'dir' | 'symlink' | 'submodule';
  content?: string; // Base64 encoded for files
  encoding?: string;
  _links: {
    self: string;
    git: string;
    html: string;
  };
}

/**
 * Parameters for listing repository contents
 */
export interface ListRepoContentsParams {
  owner: string;
  repo: string;
  path?: string;
  ref?: string; // Branch, tag, or commit SHA
}

/**
 * Parameters for getting file content
 */
export interface GetFileContentParams {
  owner: string;
  repo: string;
  path: string;
  ref?: string;
}

/**
 * Parameters for creating/updating file
 */
export interface CreateOrUpdateFileParams {
  owner: string;
  repo: string;
  path: string;
  message: string;
  content: string; // Base64 encoded
  sha?: string; // Required for updates
  branch?: string;
}

/**
 * Hook to list repository contents (files and directories)
 *
 * @example
 * const { data, isLoading } = useListRepoContents({
 *   owner: 'username',
 *   repo: 'repo-name',
 *   path: 'src'
 * });
 */
export function useListRepoContents(params: ListRepoContentsParams) {
  return useQuery({
    queryKey: ['github', 'contents', params.owner, params.repo, params.path, params.ref],
    queryFn: async () => {
      const response = await callMCPTool<MCPToolResponse>(
        '686de4e26fd1cae1afbb55bc', // GitHub MCP ID
        'GITHUB_GET_REPOSITORY_CONTENT',
        {
          owner: params.owner,
          repo: params.repo,
          path: params.path || '',
          ref: params.ref,
        }
      );

      // Parse the MCP response
      const result = JSON.parse(response.content[0].text);

      if (!result.successful) {
        throw new Error(result.error || 'Failed to fetch repository contents');
      }

      // Return array of content items
      return Array.isArray(result.data) ? result.data : [result.data] as GitHubContent[];
    },
    enabled: !!params.owner && !!params.repo,
  });
}

/**
 * Hook to get specific file content
 *
 * @example
 * const { data, isLoading } = useGetFileContent({
 *   owner: 'username',
 *   repo: 'repo-name',
 *   path: 'src/index.ts'
 * });
 */
export function useGetFileContent(params: GetFileContentParams) {
  return useQuery({
    queryKey: ['github', 'file-content', params.owner, params.repo, params.path, params.ref],
    queryFn: async () => {
      const response = await callMCPTool<MCPToolResponse>(
        '686de4e26fd1cae1afbb55bc',
        'GITHUB_REPO_S_GET_CONTENT',
        {
          owner: params.owner,
          repo: params.repo,
          path: params.path,
          ref: params.ref,
        }
      );

      const result = JSON.parse(response.content[0].text);

      if (!result.successful) {
        throw new Error(result.error || 'Failed to fetch file content');
      }

      const fileData = result.data as GitHubContent;

      // Decode base64 content if present
      if (fileData.content && fileData.encoding === 'base64') {
        fileData.content = atob(fileData.content);
      }

      return fileData;
    },
    enabled: !!params.owner && !!params.repo && !!params.path,
  });
}

/**
 * Hook to create or update a file in the repository
 *
 * @example
 * const { mutateAsync: updateFile } = useCreateOrUpdateFile();
 *
 * await updateFile({
 *   owner: 'username',
 *   repo: 'repo-name',
 *   path: 'src/newfile.ts',
 *   message: 'Add new file',
 *   content: btoa('file content'),
 * });
 */
export function useCreateOrUpdateFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: CreateOrUpdateFileParams) => {
      const response = await callMCPTool<MCPToolResponse>(
        '686de4e26fd1cae1afbb55bc',
        'GITHUB_CREATE_OR_UPDATE_FILE_CONTENTS',
        {
          owner: params.owner,
          repo: params.repo,
          path: params.path,
          message: params.message,
          content: params.content,
          sha: params.sha,
          branch: params.branch,
        }
      );

      const result = JSON.parse(response.content[0].text);

      if (!result.successful) {
        throw new Error(result.error || 'Failed to create/update file');
      }

      return result.data;
    },
    onSuccess: (_, variables) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({
        queryKey: ['github', 'contents', variables.owner, variables.repo],
      });
      queryClient.invalidateQueries({
        queryKey: ['github', 'file-content', variables.owner, variables.repo, variables.path],
      });
    },
  });
}

/**
 * Hook to delete a file from the repository
 *
 * @example
 * const { mutateAsync: deleteFile } = useDeleteFile();
 *
 * await deleteFile({
 *   owner: 'username',
 *   repo: 'repo-name',
 *   path: 'src/oldfile.ts',
 *   message: 'Remove old file',
 *   sha: 'file-sha-hash'
 * });
 */
export function useDeleteFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      owner: string;
      repo: string;
      path: string;
      message: string;
      sha: string;
      branch?: string;
    }) => {
      const response = await callMCPTool<MCPToolResponse>(
        '686de4e26fd1cae1afbb55bc',
        'GITHUB_DELETE_A_FILE',
        params
      );

      const result = JSON.parse(response.content[0].text);

      if (!result.successful) {
        throw new Error(result.error || 'Failed to delete file');
      }

      return result.data;
    },
    onSuccess: (_, variables) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({
        queryKey: ['github', 'contents', variables.owner, variables.repo],
      });
    },
  });
}

/**
 * Utility function to fetch all files recursively from a GitHub repository
 */
export async function fetchAllFilesRecursively(
  owner: string,
  repo: string,
  path: string = '',
  ref?: string
): Promise<GitHubContent[]> {
  const response = await callMCPTool<MCPToolResponse>(
    '686de4e26fd1cae1afbb55bc',
    'GITHUB_GET_REPOSITORY_CONTENT',
    { owner, repo, path, ref }
  );

  const result = JSON.parse(response.content[0].text);

  if (!result.successful) {
    throw new Error(result.error || 'Failed to fetch repository contents');
  }

  const contents: GitHubContent[] = Array.isArray(result.data) ? result.data : [result.data];
  const allFiles: GitHubContent[] = [];

  for (const item of contents) {
    if (item.type === 'file') {
      allFiles.push(item);
    } else if (item.type === 'dir') {
      // Recursively fetch directory contents
      const subFiles = await fetchAllFilesRecursively(owner, repo, item.path, ref);
      allFiles.push(...subFiles);
    }
  }

  return allFiles;
}
